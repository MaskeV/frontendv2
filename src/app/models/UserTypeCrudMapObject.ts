export class UserTypeCrudMapObject {
    create: boolean = false;
    edit: boolean = false;
    delete: boolean = false;
    tabVisibility: boolean = true;
    view: boolean = true;
  
    constructor(obj?: any) {
      if (obj) {
        this.create = obj.create === "true" || obj.create === true;
        this.edit = obj.edit === "true" || obj.edit === true;
        this.delete = obj.delete === "true" || obj.delete === true;
        this.tabVisibility = obj.tabVisibility === "true" || obj.tabVisibility === true;
        this.view = obj.view === "true" || obj.view === true;
      }
    }
  }
  