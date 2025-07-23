const Blog = require('../models/blogModel');
const Banner = require('../models/bannerModel');
const Review = require('../models/reviewModel');
const Ticket = require('../models/ticketModel');
const ExcelJS = require('exceljs');

exports.getDashboardData = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    // Tổng số
    const totalBlogs = await Blog.countDocuments({ createdAt: { $gte: start, $lt: end } });
    const totalBanners = await Banner.countDocuments({ startDate: { $gte: start, $lt: end } });
    const totalReviews = await Review.countDocuments({ createdAt: { $gte: start, $lt: end } });
    const totalSupportRequests = await Ticket.countDocuments({ createdAt: { $gte: start, $lt: end } });
    // Voucher
    const Voucher = require('../models/voucher');
    const VoucherUser = require('../models/voucherUser');
    const totalVouchers = await Voucher.countDocuments();
    const usedVouchers = await Voucher.countDocuments({ usedCount: { $gt: 0 }, createdAt: { $gte: start, $lt: end } });
    const unusedVouchers = await Voucher.countDocuments({ usedCount: 0, createdAt: { $gte: start, $lt: end } });
    const expiringVouchers = await Voucher.countDocuments({ validTo: { $gte: new Date(), $lte: new Date(Date.now() + 7*24*60*60*1000) }, createdAt: { $gte: start, $lt: end } });

    // Thống kê review
    const positiveReviews = await Review.countDocuments({ rating: { $gte: 4 }, createdAt: { $gte: start, $lt: end } });
    const negativeReviews = await Review.countDocuments({ rating: { $lte: 2 }, createdAt: { $gte: start, $lt: end } });

    // Thống kê support request
    const resolvedSupport = await Ticket.countDocuments({ status: 'resolved', createdAt: { $gte: start, $lt: end } });
    const unresolvedSupport = await Ticket.countDocuments({ status: { $ne: 'resolved' }, createdAt: { $gte: start, $lt: end } });

    // Monthly stats (aggregation)
    const months = Array.from({ length: 12 }, (_, i) => i);
    const monthlyStats = await Promise.all(months.map(async (m) => {
      const mStart = new Date(year, m, 1);
      const mEnd = new Date(year, m + 1, 1);
      const blogs = await Blog.countDocuments({ createdAt: { $gte: mStart, $lt: mEnd } });
      const banners = await Banner.countDocuments({ startDate: { $gte: mStart, $lt: mEnd } });
      const reviews = await Review.countDocuments({ createdAt: { $gte: mStart, $lt: mEnd } });
      const supports = await Ticket.countDocuments({ createdAt: { $gte: mStart, $lt: mEnd } });
      return {
        month: mStart.toLocaleString('default', { month: 'short' }),
        blogs, banners, reviews, supports
      };
    }));

    // Danh sách mới nhất
    const latestBlogs = await Blog.find({ createdAt: { $gte: start, $lt: end } }).sort({ createdAt: -1 }).limit(5);
    const latestReviews = await Review.find({ createdAt: { $gte: start, $lt: end } }).sort({ createdAt: -1 }).limit(5);
    const latestSupports = await Ticket.find({ createdAt: { $gte: start, $lt: end } }).sort({ createdAt: -1 }).limit(5);

    // Top 5 blog nhiều lượt xem nhất
    const topBlogs = await Blog.find({ createdAt: { $gte: start, $lt: end } }).sort({ views: -1 }).limit(5);

    // Lấy dữ liệu voucher
    const vouchers = await Voucher.find();
    // Lấy số người đã nhận và đã sử dụng cho từng voucher
    const voucherStats = await Promise.all(vouchers.map(async (v) => {
      const received = await VoucherUser.countDocuments({ voucherId: v._id });
      const used = await VoucherUser.countDocuments({ voucherId: v._id, used: true });
      return {
        _id: v._id,
        code: v.code,
        received,
        used
      };
    }));

    res.json({
      summary: {
        totalBlogs,
        totalBanners,
        totalReviews,
        totalSupportRequests,
        positiveReviews,
        negativeReviews,
        resolvedSupport,
        unresolvedSupport,
        // Voucher
        totalVouchers,
        usedVouchers,
        unusedVouchers,
        expiringVouchers,
      },
      monthlyStats,
      latest: {
        blogs: latestBlogs,
        reviews: latestReviews,
        supports: latestSupports,
      },
      topBlogs: topBlogs.map(b => ({ title: b.title, views: b.views || 0 })),
      year,
      voucherStats,
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy dữ liệu dashboard marketing', details: err.message });
  }
};

exports.exportDashboardExcel = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    // Lấy dữ liệu như dashboard
    const totalBlogs = await Blog.countDocuments({ createdAt: { $gte: start, $lt: end } });
    const totalBanners = await Banner.countDocuments({ startDate: { $gte: start, $lt: end } });
    const totalReviews = await Review.countDocuments({ createdAt: { $gte: start, $lt: end } });
    const totalSupportRequests = await Ticket.countDocuments({ createdAt: { $gte: start, $lt: end } });
    const positiveReviews = await Review.countDocuments({ rating: { $gte: 4 }, createdAt: { $gte: start, $lt: end } });
    const negativeReviews = await Review.countDocuments({ rating: { $lte: 2 }, createdAt: { $gte: start, $lt: end } });
    const resolvedSupport = await Ticket.countDocuments({ status: 'resolved', createdAt: { $gte: start, $lt: end } });
    const unresolvedSupport = await Ticket.countDocuments({ status: { $ne: 'resolved' }, createdAt: { $gte: start, $lt: end } });
    const months = Array.from({ length: 12 }, (_, i) => i);
    const monthlyStats = await Promise.all(months.map(async (m) => {
      const mStart = new Date(year, m, 1);
      const mEnd = new Date(year, m + 1, 1);
      const blogs = await Blog.countDocuments({ createdAt: { $gte: mStart, $lt: mEnd } });
      const banners = await Banner.countDocuments({ startDate: { $gte: mStart, $lt: mEnd } });
      const reviews = await Review.countDocuments({ createdAt: { $gte: mStart, $lt: mEnd } });
      const supports = await Ticket.countDocuments({ createdAt: { $gte: mStart, $lt: mEnd } });
      return {
        month: mStart.toLocaleString('default', { month: 'short' }),
        blogs, banners, reviews, supports
      };
    }));
    const topBlogs = await Blog.find({ createdAt: { $gte: start, $lt: end } }).sort({ views: -1 }).limit(5);

    // Tạo workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Dashboard ${year}`);

    // Tổng quan
    sheet.addRow([`Dashboard Marketing Year ${year}`]);
    sheet.addRow([]);
    sheet.addRow(['Total Blogs', 'Total Banners', 'Total Reviews', 'Total Support', 'Positive Reviews', 'Negative Reviews', 'Resolved Support', 'Unresolved Support']);
    sheet.addRow([totalBlogs, totalBanners, totalReviews, totalSupportRequests, positiveReviews, negativeReviews, resolvedSupport, unresolvedSupport]);
    sheet.addRow([]);

    // Monthly stats
    sheet.addRow(['Month', 'Blogs', 'Banners', 'Reviews', 'Support']);
    monthlyStats.forEach(m => {
      sheet.addRow([m.month, m.blogs, m.banners, m.reviews, m.supports]);
    });
    sheet.addRow([]);

    // Top blogs
    sheet.addRow(['Top 5 Most Viewed Blogs']);
    sheet.addRow(['Title', 'Views']);
    topBlogs.forEach(b => {
      sheet.addRow([b.title, b.views || 0]);
    });

    // Xuất file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=marketing_dashboard_${year}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'Export Excel error', details: err.message });
  }
}; 