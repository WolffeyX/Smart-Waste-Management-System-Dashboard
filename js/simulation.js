/**
 * Fungsi animasi lori 2D bergerak mengikut laluan algoritma
 * @param {Array} routePath - Senarai ID tong yang perlu dilawati
 * @param {Object} hashTable - Instance HashTable untuk carian koordinat O(1)
 */
async function animateTruck(routePath, hashTable) {
  // 1. Pilih elemen lori dan cast secara visual untuk IDE
  const truck = document.querySelector('#truck');
  
  // 2. Safety check: Elak error jika elemen #truck belum render di HTML
  if (!truck) {
    console.error("Elemen #truck tidak dijumpai dalam DOM!");
    return;
  }
  
  // 3. Loop laluan lori
  for (let binId of routePath) {
    const targetBin = hashTable.get(binId); // Akses info tong O(1)
    
    // Pastikan tong wujud dalam hash table sebelum gerakkan lori
    if (targetBin && targetBin.coordinates) {
      truck.style.left = `${targetBin.coordinates.x}px`;
      truck.style.top = `${targetBin.coordinates.y}px`;
      
      // Tunggu 1.5 saat (1s bergerak, 0.5s berhenti kutip)
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
}