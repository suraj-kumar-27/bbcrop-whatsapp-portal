
/**
 * Response Model for successful response
 * @export
 * @class Response
 */
export default class Response {
	constructor(result = {}, responseMessage = "Operation completed successfully") {
		this.error = 'false';
		this.message = responseMessage;
		this.data = result || {};
	}
}
