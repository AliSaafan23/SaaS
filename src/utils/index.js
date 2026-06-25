// Responses
import ApiError from './responses/ApiError.js';
import ApiResponse from './responses/ApiResponse.js';
import { errorRes } from './responses/errorResponse.js';
import showErrorsApi from './responses/showErrorsApi.js';

// Common
import { generateCode, randomCode } from './common/generateCode.js';
import deleteFiles from './common/deleteFiles.js';
import makeDir from './common/makeDir.js';
import Resize from './common/resizeFiles.js';
import uploadFiles from './common/uploadFiles.js';
import { resolveTenantContext, scopeCompany, scopeBranch, scopeCatalog } from './common/tenantIsolation.js';

// DB
import initId from './db/initId.js';

// Geo
import calculateDistanceAndTime from './geo/calculateDistanceAndTime.js';
import calculateHaversineDistance from './geo/calculateHaversineDistance.js';
import locationDataFetcher from './geo/locationDataFetcher.js';

// Validations
import { withMiddleware } from './validations/withMiddleware.js';

export {
    // Responses
    ApiError,
    ApiResponse,
    errorRes,
    showErrorsApi,

    // Common
    generateCode,
    randomCode,
    deleteFiles,
    makeDir,
    Resize,
    uploadFiles,
    resolveTenantContext,
    scopeCompany,
    scopeBranch,
    scopeCatalog,

    // DB
    initId,

    // Geo
    calculateDistanceAndTime,
    calculateHaversineDistance,
    locationDataFetcher,

    // Validations
    withMiddleware,
};
