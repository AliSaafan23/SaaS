import { validationResult } from 'express-validator';

export default (req, res, next) => {
    if (!validationResult(req).isEmpty()) {
        const firstError = validationResult(req).array()[0].msg;
        return res.status(400).json(firstError);
    }
    else {
        return next();
    }
}
