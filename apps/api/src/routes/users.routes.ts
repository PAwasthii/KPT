import { Router } from 'express';
import multer from 'multer';
import { Request } from 'express';
import { UserController } from '../controllers/users.controller.js';
import { requireAuth, requireRole, requireAdminSecret } from '../middleware/auth.middleware.js';
import { UserRole } from '@prisma/client';

const router = Router();
const userController = new UserController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req: Request, file: any, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const allowedMimes = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const allowedExts = ['.csv', '.xlsx'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'), false);
    }
  },
});

// Require authentication for all user routes
router.use(requireAuth);

// GET /api/users -- admin and above
router.get('/', requireRole([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]), userController.getAllUsers);
// POST /api/users -- system admin only
router.post('/', requireRole([UserRole.SYSTEM_ADMIN]), userController.createUser);
// POST /api/users/import -- system admin only (bulk import via JSON)
router.post('/import', requireRole([UserRole.SYSTEM_ADMIN]), (req, res) => userController.importUsers(req, res));
// POST /api/users/import/file -- system admin only (bulk import via file upload)
router.post('/import/file', requireRole([UserRole.SYSTEM_ADMIN]), upload.single('file'), (req, res) => userController.importUsersFile(req, res));
// GET /api/users/import/template -- get template info (JSON)
router.get('/import/template', requireRole([UserRole.SYSTEM_ADMIN]), (req, res) => userController.getImportTemplate(req, res));
// GET /api/users/import/template/download -- download Excel template with picklists
router.get('/import/template/download', requireRole([UserRole.SYSTEM_ADMIN]), (req, res) => userController.downloadTemplate(req, res));
// GET /api/users/import/template/download/csv -- download CSV template
router.get('/import/template/download/csv', requireRole([UserRole.SYSTEM_ADMIN]), (req, res) => userController.downloadTemplateCsv(req, res));
// GET user by id -- admin and above
router.get('/:id', requireRole([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]), userController.getUserById);
// PUT user by id -- admin and above
router.put('/:id', requireRole([UserRole.ADMIN, UserRole.SYSTEM_ADMIN]), userController.updateUser);
// Update user permissions (remove entirely as permissions no longer exist)
// DELETE user -- system admin only
router.delete('/:id', requireRole([UserRole.SYSTEM_ADMIN]), userController.deleteUser);

export default router;
