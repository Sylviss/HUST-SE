// ./frontend/src/pages/customer/CustomerReservationPage.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom'; // For potential navigation on success
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// We'll need a new thunk in reservationSlice for customer submissions
import { submitCustomerReservation, clearReservationActionError } from '../../store/slices/reservationSlice';

// Zod Schema for customer reservation form validation
const reservationSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  contactPhone: z.string().min(10, { message: "Phone number must be at least 10 digits." }).regex(/^\+?[0-9\s-()]+$/, "Invalid phone number format."),
  contactEmail: z.string().email({ message: "Invalid email address." }),
  reservationDate: z.string().min(1, { message: "Date is required." }), // Will be combined with time
  reservationTime: z.string().min(1, { message: "Time is required." }), // e.g., "19:00"
  partySize: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number({ invalid_type_error: "Party size must be a number"}).min(1, { message: "Party size must be at least 1."}).max(20, {message: "For parties larger than 20, please call."}) // Example max
  ),
  notes: z.string().max(200, { message: "Notes cannot exceed 200 characters."}).optional(),
});


function CustomerReservationPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    isProcessingAction: isSubmitting, // from reservationSlice (confirm/cancel, could be a general submitting flag)
    actionError: submitError         // from reservationSlice
  } = useSelector((state) => state.reservations);

  const [submissionStatus, setSubmissionStatus] = useState(''); // 'success', 'error', ''

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
        reservationDate: new Date().toISOString().split('T')[0], // Default to today
        reservationTime: "19:00", // Default to 7 PM
        partySize: 2,
    }
  });

  useEffect(() => {
    // Clear any previous submission errors when the component mounts or unmounts
    dispatch(clearReservationActionError());
    return () => {
      dispatch(clearReservationActionError());
    }
  }, [dispatch]);


  const handleFormSubmit = async (data) => {
    setSubmissionStatus(''); // Clear previous status
    const { reservationDate, reservationTime, ...restOfData } = data;
    // Combine date and time into a full ISO string or a format your backend expects
    // Assuming backend can parse "YYYY-MM-DDTHH:mm"
    const fullReservationTime = `${reservationDate}T${reservationTime}:00.000Z`; // Construct ISO string; consider timezone carefully
                                                                            // Or send date and time separately if backend handles that

    const reservationPayload = {
        ...restOfData, // name, contactPhone, contactEmail, partySize, notes
        reservationTime: fullReservationTime,
    };
    // The backend API for POST /reservations expects customer details directly
    // and reservation details (time, party size, notes)
    // It internally calls findOrCreateCustomer and then createReservation.

    const resultAction = await dispatch(submitCustomerReservation(reservationPayload));

    if (submitCustomerReservation.fulfilled.match(resultAction)) {
      setSubmissionStatus('success');
      reset(); // Clear the form
    } else {
      setSubmissionStatus('error');
      // Error message is already in submitError from the slice
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Make a Reservation
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Book your table with us!
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
              <input id="name" type="text" {...register("name")} required
                     className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"/>
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
              <input id="contactPhone" type="tel" {...register("contactPhone")} required
                     className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"/>
              {errors.contactPhone && <p className="mt-1 text-xs text-red-500">{errors.contactPhone.message}</p>}
            </div>

            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
              <input id="contactEmail" type="email" {...register("contactEmail")} required
                     className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"/>
              {errors.contactEmail && <p className="mt-1 text-xs text-red-500">{errors.contactEmail.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="reservationDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                    <input id="reservationDate" type="date" {...register("reservationDate")} required
                           min={new Date().toISOString().split('T')[0]} // Prevent past dates
                           className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"/>
                    {errors.reservationDate && <p className="mt-1 text-xs text-red-500">{errors.reservationDate.message}</p>}
                </div>
                <div>
                    <label htmlFor="reservationTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time</label>
                    <input id="reservationTime" type="time" {...register("reservationTime")} required
                           className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"/>
                    {errors.reservationTime && <p className="mt-1 text-xs text-red-500">{errors.reservationTime.message}</p>}
                </div>
            </div>


            <div>
              <label htmlFor="partySize" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Party Size</label>
              <input id="partySize" type="number" {...register("partySize")} required min="1"
                     className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"/>
              {errors.partySize && <p className="mt-1 text-xs text-red-500">{errors.partySize.message}</p>}
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Special Requests (Optional)</label>
              <textarea id="notes" {...register("notes")} rows="3"
                        className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"/>
              {errors.notes && <p className="mt-1 text-xs text-red-500">{errors.notes.message}</p>}
            </div>

            {submissionStatus === 'success' && (
              <div className="p-3 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 rounded-md text-sm">
                Reservation request submitted successfully! Our staff will contact you shortly if confirmation is needed.
              </div>
            )}
            {submitError && submissionStatus === 'error' && ( // Only show submitError if current submission failed
              <div className="p-3 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-md text-sm">
                Error: {submitError}
              </div>
            )}

            <div>
              <button type="submit" disabled={isSubmitting}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                {isSubmitting ? 'Submitting Request...' : 'Request Reservation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CustomerReservationPage;