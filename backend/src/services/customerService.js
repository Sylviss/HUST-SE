// ./backend/src/services/customerService.js
import prisma from '../db/prismaClient.js';

export const findOrCreateCustomer = async (customerData) => {
  const { name, contactPhone, contactEmail } = customerData;
  let customer;

  if (contactEmail) {
    customer = await prisma.customer.findUnique({ where: { contactEmail } });
  }
  if (!customer && contactPhone) {
    customer = await prisma.customer.findUnique({ where: { contactPhone } });
  }

  if (!customer) {
    customer = await prisma.customer.create({
      data: { name, contactPhone, contactEmail },
    });
  } else if (customer.name !== name) {
    // Optionally update name if a match was found on phone/email but name differs
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { name }
    });
  }
  return customer;
};