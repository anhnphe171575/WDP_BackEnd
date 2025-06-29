const mongoose = require('mongoose');
const ProductVariant = require('./models/productVariant');
require('./config/db');

async function updateCostPrice() {
  try {
    console.log('Bắt đầu cập nhật costPrice...');
    
    // Lấy tất cả product variants
    const variants = await ProductVariant.find({});
    console.log(`Tìm thấy ${variants.length} product variants`);
    
    let updatedCount = 0;
    
    for (const variant of variants) {
      // Nếu chưa có costPrice, set bằng 70% của sellPrice (giả sử lãi 30%)
      if (!variant.costPrice || variant.costPrice === 0) {
        const estimatedCostPrice = Math.round(variant.sellPrice * 0.7);
        variant.costPrice = estimatedCostPrice;
        await variant.save();
        updatedCount++;
        console.log(`Cập nhật variant ${variant._id}: sellPrice=${variant.sellPrice}, costPrice=${estimatedCostPrice}`);
      }
    }
    
    console.log(`Hoàn thành! Đã cập nhật ${updatedCount} product variants`);
    
  } catch (error) {
    console.error('Lỗi khi cập nhật costPrice:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Chạy script
updateCostPrice(); 