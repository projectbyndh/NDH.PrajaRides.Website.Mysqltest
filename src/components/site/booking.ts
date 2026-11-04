// Offline booking: riders without the app book by phone, WhatsApp or at the office.

const WHATSAPP_BOOKING_TEXT = "Hello Praja Ride, I'd like to book a ride.\nPickup: \nDrop-off: \nTime: ";

/** WhatsApp chat with the booking message pre-filled (Nepal numbers, +977). */
export function bookingWhatsAppUrl(phone: string): string {
  return `https://wa.me/977${phone}?text=${encodeURIComponent(WHATSAPP_BOOKING_TEXT)}`;
}
