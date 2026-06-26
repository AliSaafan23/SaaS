import express from 'express';
import tenantUserController from '../../../controllers/dashboard/tenantUserController.js';
import tenantUserValidation from '../../../utils/validations/dashboard/tenantUserValidation.js';
import { requirePermission } from '../../../middleware/index.js';
import { TENANT_PERMISSIONS } from '../../../config/tenantPermissions.js';

const router = express.Router();

router.get('/', 
    requirePermission(TENANT_PERMISSIONS.USERS_MANAGE), 
    tenantUserController.getAll
);

router.get('/:id', 
    requirePermission(TENANT_PERMISSIONS.USERS_MANAGE), 
    tenantUserValidation.validateId(), 
    tenantUserController.getOne
);

router.post('/', 
    requirePermission(TENANT_PERMISSIONS.USERS_MANAGE), 
    tenantUserValidation.validateCreate(), 
    tenantUserController.create
);

router.put('/:id', 
    requirePermission(TENANT_PERMISSIONS.USERS_MANAGE), 
    tenantUserValidation.validateUpdate(), 
    tenantUserController.update
);

router.delete('/:id', 
    requirePermission(TENANT_PERMISSIONS.USERS_MANAGE), 
    tenantUserValidation.validateId(), 
    tenantUserController.delete
);

export default router;
