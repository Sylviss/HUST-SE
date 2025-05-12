// ./frontend/src/components/forms/MenuItemForm.jsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define Zod schema for validation
const menuItemSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters long" }),
  description: z.string().optional(),
  price: z.preprocess(
    (val) => parseFloat(String(val)), // Convert string to number
    z.number({ invalid_type_error: "Price must be a number"}).positive({ message: "Price must be positive" })
  ),
  isAvailable: z.boolean().default(true),
  tags: z.string().transform(val => val.split(',').map(tag => tag.trim()).filter(tag => tag !== "")).optional(), // Split comma-separated string into array
  imageUrl: z.string().url({ message: "Please enter a valid URL" }).optional().or(z.literal('')),
});

function MenuItemForm({ onSubmit, initialData = {}, isSubmitting = false, submitError = null }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: initialData.name || '',
      description: initialData.description || '',
      price: initialData.price || '',
      isAvailable: initialData.isAvailable === undefined ? true : initialData.isAvailable,
      tags: initialData.tags ? initialData.tags.join(', ') : '',
      imageUrl: initialData.imageUrl || '',
    },
  });

  useEffect(() => {
    // Only reset if initialData represents an actual item (e.g., has an ID)
    // or if you have a specific prop indicating it's an edit form.
    // For AddNewMenuItemPage, initialData will be {} and won't have initialData.id
    if (initialData && initialData.id) { // Check if initialData is for an existing item
      reset({
        name: initialData.name || '',
        description: initialData.description || '',
        price: initialData.price || '',
        isAvailable: initialData.isAvailable === undefined ? true : initialData.isAvailable,
        tags: initialData.tags ? initialData.tags.join(', ') : '',
        imageUrl: initialData.imageUrl || '',
      });
    } else if (!initialData.id) {
      // This is an "add new" form or initialData is empty, set default values once.
      // The defaultValues in useForm should handle the initial empty state.
      // If you still want to explicitly reset for "add new" if initialData *reference* changes
      // but is still effectively "empty", you might need a more specific condition or ensure
      // the parent passes a stable empty object reference.
      // For now, let's assume defaultValues in useForm handles the "add" case well enough initially.
    }
  }, [initialData.id, initialData.name, initialData.description, initialData.price, initialData.isAvailable, initialData.tags, initialData.imageUrl, reset]);

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
        <input
          type="text"
          id="name"
          {...register("name")}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
        <textarea
          id="description"
          rows="3"
          {...register("description")}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
        />
        {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Price</label>
        <input
          type="number"
          id="price"
          step="0.01"
          {...register("price")}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
        />
        {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>}
      </div>

      <div className="flex items-center">
        <input
          id="isAvailable"
          type="checkbox"
          {...register("isAvailable")}
          className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:bg-gray-700"
        />
        <label htmlFor="isAvailable" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Available</label>
      </div>
      {errors.isAvailable && <p className="mt-1 text-xs text-red-500">{errors.isAvailable.message}</p>}


      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags (comma-separated)</label>
        <input
          type="text"
          id="tags"
          {...register("tags")}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
          placeholder="e.g., burger, spicy, vegetarian"
        />
        {errors.tags && <p className="mt-1 text-xs text-red-500">{errors.tags.message}</p>}
      </div>

       <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Image URL</label>
        <input
          type="url"
          id="imageUrl"
          {...register("imageUrl")}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
          placeholder="https://example.com/image.jpg"
        />
        {errors.imageUrl && <p className="mt-1 text-xs text-red-500">{errors.imageUrl.message}</p>}
      </div>


      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : (initialData.id ? 'Update Item' : 'Add Item')}
      </button>
    </form>
  );
}

export default MenuItemForm;