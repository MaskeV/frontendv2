export class AngularLog {
    pageName : String;
	userId : String;
	msg : String;
	level : String;
    
    constructor(userId : String,pageName : String,level : String, msg : String) { 
        this.userId=userId;
        this.pageName=pageName;
        this.level=level;
        this.msg=msg;
    }
}