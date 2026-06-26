import express from 'express';
import tenantRoleController from '../../../controllers/dashboard/tenantRoleController.js';
import tenantRoleValidation from '../../../utils/validations/dashboard/tenantRoleValidation.js';
import { requirePermission } from '../../../middleware/index.js';
import { TENANT_PERMISSIONS } from '../../../config/tenantPermissions.js';

const router = express.Router();

router.get('/', 
    requirePermission(TENANT_PERMISSIONS.ROLES_MANAGE), 
    tenantRoleController.getAll
);

router.get('/:id', 
    requirePermission(TENANT_PERMISSIONS.ROLES_MANAGE), 
    tenantRoleValidation.validateId(), 
    tenantRoleController.getOne
);

router.post('/', 
    requirePermission(TENANT_PERMISSIONS.ROLES_MANAGE), 
    tenantRoleValidation.validateCreate(), 
    tenantRoleController.create
);

router.put('/:id', 
    requirePermission(TENANT_PERMISSIONS.ROLES_MANAGE), 
    tenantRoleValidation.validateUpdate(), 
    tenantRoleController.update
);

router.delete('/:id', 
    requirePermission(TENANT_PERMISSIONS.ROLES_MANAGE), 
    tenantRoleValidation.validateId(), 
    tenantRoleController.delete
);

export default router;
