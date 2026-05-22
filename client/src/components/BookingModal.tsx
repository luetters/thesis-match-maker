import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examinerName: string;
  examinerEmail: string;
}

type CalendarDate = Date | [Date, Date] | null;

export function BookingModal({ open, onOpenChange, examinerName, examinerEmail }: BookingModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock available time slots (in real app, fetch from backend)
  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
  ];

  const handleDateChange = (date: CalendarDate) => {
    // react-calendar returns Date | [Date, Date] | null
    if (date instanceof Date) {
      setSelectedDate(date);
      setSelectedTime("");
    } else if (Array.isArray(date) && date[0] instanceof Date) {
      setSelectedDate(date[0]);
      setSelectedTime("");
    }
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Bitte wählen Sie ein Datum und eine Uhrzeit.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Format the booking details
      const bookingDate = selectedDate.toLocaleDateString("de-DE");
      const bookingDateTime = `${bookingDate} ${selectedTime} Uhr`;

      // In real app, send to backend
      console.log("Booking:", {
        examiner: examinerName,
        email: examinerEmail,
        dateTime: bookingDateTime,
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(`Termin gebucht für ${bookingDateTime}`);
      onOpenChange(false);
      setSelectedDate(null);
      setSelectedTime("");
    } catch (error) {
      toast.error("Fehler beim Buchen des Termins");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Disable past dates
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Check if date is disabled
  const tileDisabled = ({ date }: { date: Date }) => isDateDisabled(date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Termin mit {examinerName} buchen</DialogTitle>
          <DialogClose />
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Calendar */}
          <div className="flex justify-center">
            <div className="react-calendar-wrapper">
            <Calendar
              onChange={handleDateChange as any}
              value={selectedDate}
              tileDisabled={tileDisabled}
              minDate={new Date()}
              locale="de-DE"
              className="border border-gray-200 rounded-lg p-4"
            />
            </div>
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-900">
                Verfügbare Uhrzeiten am {selectedDate.toLocaleDateString("de-DE")}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      selectedTime === time
                        ? "bg-[#76b900] text-white border border-[#76b900]"
                        : "border border-gray-200 text-gray-700 hover:border-[#76b900] hover:text-[#76b900]"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {selectedDate && selectedTime && (
            <div className="bg-[#f6ffe0] border border-[#76b900]/30 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Gebuchter Termin:</span>
                <br />
                {selectedDate.toLocaleDateString("de-DE", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                um {selectedTime} Uhr
                <br />
                <span className="text-xs text-gray-500 mt-2 block">
                  Bestätigungsmail wird an {examinerEmail} gesendet
                </span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleBooking}
              disabled={!selectedDate || !selectedTime || isSubmitting}
              className="bg-[#76b900] hover:bg-[#6ba300] text-white"
            >
              {isSubmitting ? "Wird gebucht..." : "Termin bestätigen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
