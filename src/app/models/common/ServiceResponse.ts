export interface ServiceResponse<T> {
  serviceResponse: T;
  serviceStatus: string;
  serviceError: any;
  metaData: any;

  STATUS_FAIL: "Fail";
  STATUS_SUCCESS: "Success";
  PUBLISHED: "PUBLISHED";
  DATA_NOT_FOUND: "Data Not Found";
  SOMETHING_WENT_WRONG: "Something Went Wrong";
}
