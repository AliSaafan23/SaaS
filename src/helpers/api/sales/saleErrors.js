export class SaleScopeError extends Error {
    constructor(code) {
        super(code);
        this.code = code;
    }
}

export default { SaleScopeError };
