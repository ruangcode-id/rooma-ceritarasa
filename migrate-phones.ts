import { prisma } from './src/infrastructure/database/prisma';

async function main() {
  console.log('Starting phone number migration...');
  
  // Get all guests
  const guests = await prisma.guest.findMany();
  let updatedCount = 0;

  for (const guest of guests) {
    let newPhone = guest.phone.trim().replace(/[\s.-]/g, "");
    
    let needsUpdate = false;
    
    if (newPhone.startsWith("08")) {
      newPhone = "+628" + newPhone.slice(2);
      needsUpdate = true;
    } else if (newPhone.startsWith("62")) {
      newPhone = "+" + newPhone;
      needsUpdate = true;
    }

    if (needsUpdate && newPhone !== guest.phone) {
      await prisma.guest.update({
        where: { id: guest.id },
        data: { phone: newPhone }
      });
      updatedCount++;
      console.log(`Updated ${guest.phone} -> ${newPhone}`);
    }
  }

  console.log(`Migration completed. Updated ${updatedCount} guests.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
