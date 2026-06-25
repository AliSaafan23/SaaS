
class ApiResponse {

    constructor(key, msg, code, data, type, request, page, pageCount, limit, total, notifyCount) {
        this.success      = key === 'success' ? true : false; // Always true for successful responses
        this.key          = key;
        this.message      = msg;
        this.code         = code;
        this.data         = data;
        this.notifyCount  = notifyCount;
        // this.page       = page;
        // this.pageCount  = pageCount;
        // this.limit      = limit;
        // this.total      = total;

        if(type === 'api'){
            this.linkPagnate(page,pageCount, limit,total);
        }
    }
    
    linkPagnate(page,pageCount, limit,total) {
        this.paginate   = {
            currentPage : page,
            lastPage    : (pageCount === 0) ? 1 : pageCount,
            perPage     : limit,
            total       : total,
        }
    }

}
export default ApiResponse;