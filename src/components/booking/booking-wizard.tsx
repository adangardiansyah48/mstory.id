"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import Swal from "sweetalert2";
import { createClient } from "@/lib/supabase/client";
import { getBookingData, peekBookingData } from "@/lib/booking-data";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { Addon, Category, Package, SubCategory } from "@/lib/types";
import { Step1Category } from "@/components/booking/step1-category";
import { Step2Schedule } from "@/components/booking/step2-schedule";
import { Step3Summary } from "@/components/booking/step3-summary";
import {
  buildInvoiceMessage,
  buildWhatsAppLink,
  formatCurrency,
  generateInvoiceNumber,
  isValidWhatsAppNumber,
  normalizeWhatsAppNumber,
  whatsAppValidationMessage,
} from "@/lib/utils";
import {
  PAYMENT_ACCOUNT,
  PAYMENT_ACCOUNT_HOLDER,
  PAYMENT_BANK,
  WHATSAPP_ADMIN_NUMBER,
  addonIcon,
  type WizardClientDetails,
} from "@/lib/types";

interface BookingWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  waNumber?: string;
  transportFeeDefault?: number;
}

interface BookingSelection {
  category: Category | null;
  subCategory: SubCategory | null;
  selectedPackage: Package | null;
  addons: Addon[];
}

export const TRANSPORT_FEE_LUAR_KOTA = 250000;

export function BookingWizard({
  open,
  onClose,
  onSuccess,
  waNumber,
  transportFeeDefault,
}: BookingWizardProps) {
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>(
    () => peekBookingData()?.categories ?? [],
  );
  const [subCategories, setSubCategories] = useState<SubCategory[]>(
    () => peekBookingData()?.subCategories ?? [],
  );
  const [packages, setPackages] = useState<Package[]>(
    () => peekBookingData()?.packages ?? [],
  );
  const [addons, setAddons] = useState<Addon[]>(
    () => peekBookingData()?.addons ?? [],
  );
  const [bookedCounts, setBookedCounts] = useState<Record<string, number>>(
    () => peekBookingData()?.bookedCounts ?? {},
  );

  const [selection, setSelection] = useState<BookingSelection>({
    category: null,
    subCategory: null,
    selectedPackage: null,
    addons: [],
  });

  const [client, setClient] = useState<WizardClientDetails>({
    fullName: "",
    whatsappNumber: "",
    locationType: "KOTA_TASIK",
    travelHours: "",
    eventAddress: "",
    eventDate: "",
    notes: "",
    agreedToTerms: false,
  });

  const [loading, setLoading] = useState(
    () => peekBookingData() === null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    invoiceNumber: string;
    waLink: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [step]);

  useEffect(() => {
    if (submitResult && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0 });
    }
  }, [submitResult]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getBookingData();
        if (cancelled) return;
        setCategories(data.categories);
        setSubCategories(data.subCategories);
        setPackages(data.packages);
        setAddons(data.addons);
        setBookedCounts(data.bookedCounts);
      } catch (err) {
        console.error("Failed to load booking data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subtotal =
    (selection.selectedPackage?.price || 0) +
    selection.addons.reduce((sum, a) => sum + a.price, 0);

  const ratePerJam = transportFeeDefault ?? TRANSPORT_FEE_LUAR_KOTA;
  const jam = Math.max(0, Number(client.travelHours) || 0);
  const transportFee =
    client.locationType === "LUAR_KOTA" ? Math.round(jam * ratePerJam) : 0;

  const grandTotal = subtotal + transportFee;
  const dpValue = Number(selection.selectedPackage?.dp_value ?? 0);
  const dpAmount = dpValue;
  const dpLabel = "DP";
  const remainingBalance = grandTotal - dpAmount;

  const filteredSubs = selection.category
    ? subCategories.filter(
        (s) => s.category_id === (selection.category?.id ?? 0),
      )
    : [];

  const filteredPackages = selection.subCategory
    ? packages.filter(
        (p) => p.sub_category_id === (selection.subCategory?.id ?? 0),
      )
    : [];

  const canProceedStep2 =
    !!selection.selectedPackage &&
    !!client.eventDate &&
    !!client.fullName.trim() &&
    isValidWhatsAppNumber(client.whatsappNumber) &&
    !!client.eventAddress.trim() &&
    (client.locationType !== "LUAR_KOTA" || (Number(client.travelHours) || 0) > 0);

  async function handleSubmit() {
    if (!selection.selectedPackage) return;
    const waError = whatsAppValidationMessage(client.whatsappNumber);
    if (waError) {
      await Swal.fire({ icon: "error", title: "No. WhatsApp Tidak Valid", text: waError });
      return;
    }
    setSubmitting(true);

    const supabase = createClient();
    if (!supabase) {
      setSubmitting(false);
      await Swal.fire({
        icon: "error",
        title: "Supabase Belum Dikonfigurasi",
        text: "Isi .env.local terlebih dahulu.",
      });
      return;
    }
    let invoiceNumber = await generateInvoiceNumber();
    const normalizedPhone = normalizeWhatsAppNumber(client.whatsappNumber);

     try {
       const { data: clientData, error: clientError } = await supabase
         .from("clients")
         .insert({
           full_name: client.fullName,
           whatsapp_number: normalizedPhone,
         })
         .select()
         .single();

       if (clientError) throw clientError;

       let bookingData;
       try {
         let inv = invoiceNumber;
         for (let attempt = 0; attempt < 3; attempt++) {
           const { data: bd, error: be } = await supabase
             .from("bookings")
             .insert({
               invoice_number: inv,
               client_id: clientData.id,
               event_date: client.eventDate,
               location_type: client.locationType,
               event_address: client.eventAddress,
               subtotal: subtotal,
               transport_fee: transportFee,
               grand_total: grandTotal,
               dp_amount: dpAmount,
               status: "MENUNGGU_DP",
               notes: client.notes || null,
             })
             .select()
             .single();
           if (!be) { bookingData = bd; invoiceNumber = inv; break; }
           if ((be as { code?: string }).code === "23505" && attempt < 2) {
             inv = await generateInvoiceNumber();
             continue;
           }
           throw be;
         }
         if (!bookingData) throw new Error("Gagal membuat booking");
       } catch (bookingErr) {
         await supabase.from("clients").delete().eq("id", clientData.id);
         throw bookingErr;
       }

       const detailInsert = supabase
         .from("booking_details")
         .insert({
           booking_id: bookingData.id,
           package_id: selection.selectedPackage.id,
           price_at_booking: selection.selectedPackage.price,
         });

       if (selection.addons.length > 0) {
         await supabase.from("booking_addons").insert(
           selection.addons.map((a) => ({
             booking_id: bookingData.id,
             addon_id: a.id,
             price_at_booking: a.price,
             qty: 1,
           })),
         );
       }

       const { error: detailError } = await detailInsert;
       if (detailError) throw detailError;

      const packageDescription = [
        `*KATEGORI*`,
        `${selection.category?.name}`,
        ``,
        `*JENIS PAKET*`,
        `${selection.subCategory?.name}`,
        ``,
        `*PAKET*`,
        `• ${selection.selectedPackage.name} (${formatCurrency(selection.selectedPackage.price)})`,
        ...(selection.addons.length > 0 ? [
          ``,
          `*ADD-ONS*`,
          ...selection.addons.map(
            (a) => `• ${addonIcon(a.name)} ${a.name} (${formatCurrency(a.price)})`,
          ),
        ] : []),
      ].join("\n");

      const message = buildInvoiceMessage({
        invoiceNumber,
        fullName: client.fullName,
        whatsappNumber: normalizedPhone,
        eventDate: client.eventDate,
        eventAddress: client.eventAddress,
        locationLabel:
          client.locationType === "KOTA_TASIK"
            ? "Kota Tasikmalaya"
            : "Luar Kota",
        packageDescription,
        subtotal,
        transportFee,
        grandTotal,
        dpLabel,
        dpAmount,
        remainingBalance,
        paymentBank: PAYMENT_BANK,
        paymentAccount: PAYMENT_ACCOUNT,
        paymentHolder: PAYMENT_ACCOUNT_HOLDER,
      });

      const waLink = buildWhatsAppLink(
        waNumber || WHATSAPP_ADMIN_NUMBER,
        message,
      );
      setSubmitResult({ invoiceNumber, waLink });
      onSuccess?.();
    } catch (err) {
      const e = err as { message?: string; details?: string; hint?: string; code?: string };
      const detail =
        e?.message || e?.details || e?.hint || e?.code || "Unknown error";
      console.error("Failed to submit booking:", JSON.stringify(e), err);
      await Swal.fire({
        icon: "error",
        title: "Gagal Mengirim Booking",
        text: `${detail}\n\nSilakan coba lagi.`,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function closeWizard() {
    setSubmitResult(null);
    setStep(1);
    onClose();
  }

  return (
    <Modal open={open} onClose={closeWizard}>
      <div className="flex flex-col overflow-hidden">
        <div className="border-b border-white/40 px-6 pb-4 pt-6">
          {submitResult ? (
            <div className="py-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#4CAF50]/15">
                <Check className="h-8 w-8 text-[#4CAF50]" strokeWidth={2.5} />
              </div>
              <h3 className="mt-4 font-serif text-xl font-semibold text-[var(--ink)]">
                Booking Berhasil Dibuat!
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Kirim invoice via WhatsApp ke admin, lalu tunggu verifikasi DP
                agar status berubah menjadi Menunggu Pelunasan.
              </p>
              <div className="mt-4 rounded-2xl bg-white/60 p-4 backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  No. Invoice
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-[var(--ink)]">
                  {submitResult.invoiceNumber}
                </p>
              </div>
            </div>
          ) : (
            <>
              <h2 className="font-serif text-2xl font-semibold tracking-tight text-[var(--ink)]">
                Booking Online
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Kalkulator Estimasi Biaya & Reservasi
              </p>
              <div className="mt-4 flex items-center gap-2">
                {["Paket", "Jadwal", "Ringkasan"].map((label, i) => (
                  <div key={label} className="flex flex-1 items-center gap-2">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        step > i + 1
                          ? "bg-[var(--brand)]/20 text-[var(--brand)]"
                          : step === i + 1
                            ? "bg-[var(--brand)] text-white"
                            : "bg-white/60 text-[var(--muted)]"
                      }`}
                    >
                      {step > i + 1 ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className="hidden text-xs font-medium tracking-wide text-[var(--muted)] sm:block">
                      {label}
                    </span>
                    {i < 2 && <span className="mx-1 h-px flex-1 bg-white/40" />}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[var(--brand)]/30 border-t-[var(--brand)]" />
              <p className="text-sm text-[var(--muted)]">Memuat data...</p>
            </div>
          ) : submitResult ? (
            <div className="px-6 py-6">
              <div className="space-y-4">
                <div className="rounded-[2rem] border border-white/50 bg-white/65 p-4 backdrop-blur-md">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Langkah Selanjutnya
                  </h4>
                  <ol className="mt-3 space-y-3 text-sm text-[var(--ink)]">
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-bold text-white">1</span>
                      <span>Buka WhatsApp dan kirim pesanan paket ini ke admin Mstory.id</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-bold text-white">2</span>
                      <span>Transfer DP <strong>{formatCurrency(dpAmount)}</strong> ke {PAYMENT_BANK} {PAYMENT_ACCOUNT} A/n {PAYMENT_ACCOUNT_HOLDER}</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-bold text-white">3</span>
                      <span>Kirim bukti transfer ke admin untuk konfirmasi booking</span>
                    </li>
                  </ol>
                </div>
                <p className="text-center text-xs text-[var(--muted)]">
                  DP tidak dapat dikembalikan jika booking dibatalkan setelah
                  invoice dibuat.
                </p>
              </div>
            </div>
          ) : (
            <>
              {step === 1 && (
                <Step1Category
                  categories={categories}
                  subCategories={filteredSubs}
                  packages={filteredPackages}
                  addons={addons}
                  selection={selection}
                  setSelection={setSelection}
                />
              )}
              {step === 2 && (
                <Step2Schedule
                  bookedCounts={bookedCounts}
                  client={client}
                  setClient={setClient}
                  transportFeeDefault={transportFeeDefault}
                />
              )}
              {step === 3 && (
                <Step3Summary
                  selection={selection}
                  client={client}
                  setClient={setClient}
                  subtotal={subtotal}
                  transportFee={transportFee}
                  grandTotal={grandTotal}
                  dpLabel={dpLabel}
                  dpAmount={dpAmount}
                  remainingBalance={remainingBalance}
                />
              )}
            </>
          )}
        </div>

        {!submitResult && !loading && (
          <div className="flex items-center justify-between gap-3 border-t border-white/40 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => step > 1 && setStep(step - 1)}
              disabled={step === 1}
            >
              Kembali
            </Button>

            {step === 1 && (
              <Button
                disabled={!selection.selectedPackage}
                onClick={() => setStep(2)}
              >
                Lanjut
              </Button>
            )}

            {step === 2 && (
              <Button disabled={!canProceedStep2} onClick={() => setStep(3)}>
                Lanjut
              </Button>
            )}

            {step === 3 && (
              <Button
                variant="success"
                disabled={!client.agreedToTerms || submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Mengirim..." : "Konfirmasi & Kirim"}
              </Button>
            )}
          </div>
        )}

        {submitResult && !loading && (
          <div className="flex items-center justify-center gap-3 border-t border-white/40 px-6 py-4">
            <a
              href={submitResult.waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#25D366] px-7 text-sm font-semibold uppercase tracking-widest text-white shadow-lg shadow-green-500/20 transition-colors hover:bg-[#1eb958]"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Kirim ke WhatsApp
            </a>
            <Button variant="ghost" onClick={closeWizard}>
              Tutup
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}