import { Router } from 'express';
import { PerformanceController } from '../controllers/performance.controller.js';

const router = Router();
const performanceController = new PerformanceController();

// GET /api/kpt/performance/revenue-analysis — full revenue analysis with KPIs, trend, partner/product/category tables
router.get('/revenue-analysis', performanceController.getRevenueAnalysis.bind(performanceController));

// GET /api/kpt/performance/revenue — per-partner revenue sorted by ytdSales desc
router.get('/revenue', performanceController.getRevenueSummary.bind(performanceController));

// GET /api/kpt/performance/rankings — leaderboard with rank, achievementPct
router.get('/rankings', performanceController.getPartnerRankings.bind(performanceController));

// GET /api/kpt/performance/trends — last 8 months of incentive data grouped by period
router.get('/trends', performanceController.getMonthlyTrends.bind(performanceController));

// GET /api/kpt/performance/kpis — dashboard KPIs
router.get('/kpis', performanceController.getDashboardKPIs.bind(performanceController));

export default router;
