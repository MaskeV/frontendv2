import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user';
import { Feature } from '../models/feature';
import { Role } from '../models/Role';
import { FeatureMaster } from '../models/feature-master';
import { ApplicationMaster } from '../models/application-master';

@Injectable({
    providedIn: 'root'
})
export class UserService {


    // private baseUrl = "http://localhost:12002";
    // private baseUrl = "http://192.168.13.218:12002";
    private baseUrl = environment.baseUrl;

    constructor(private http: HttpClient) { }

    getIndicesByRoleID(role: Role): Observable<object> {
        return this.http.post(`${this.baseUrl}` + '/data-discover/api/getIndicesByRoleID', role);
    }

    getAllAppListByRole(role: any) {
        return this.http.post(`${this.baseUrl}` + `/application/api/getAllAppListByRole`, role);
    }

    getInfraApmByRoleID(sessionDTO: any, roleId: number) {

        return this.http.get(`${this.baseUrl}` + `/role/api/getAllInfraApmRoleDetailsByRoleId?roleId= ${roleId}`, { params: sessionDTO });
    }

    getAllElkId(data: any) {
        let sessionDTO = data;
        return this.http.get(`${this.baseUrl}` + '/interfaceConfig/api/getAllElkId', { params: sessionDTO });
    }
    // getAllElkId(data: any) {
    //     let sessionDTO = data;
    //     return this.http.get(`http://localhost:12005` + '/interfaceConfig/api/getAllElkId', { params: sessionDTO });
    // }


    saveDashboardRefreshInterval(object: any): Observable<object> {
        return this.http.post(`${this.baseUrl}` + '/feature/api/saveDashboardRefreshInterval', object);
    }

    saveDashboardTheme(object: any): Observable<object> {
        return this.http.post(`${this.baseUrl}` + '/dashboard/api/saveDashboardTheme', object);
    }

    //New Services Code Author : Rahul mahajan | Date : 08-03-2021
    getFeatureByUserId(user: User) {
        return this.http.post(`${this.baseUrl}` + '/user/api/getFeatureByUserId', user);
    }

    getAllRoles(data: any) {
        let sessionDTO = data;
        return this.http.get(`${this.baseUrl}` + `/role/api/getAllRoles`, { params: sessionDTO });
    }

    // getAllRoles(data: any) {
    //     let sessionDTO = data;
    //     return this.http.get(`http://localhost:12003` + `/role/api/getAllRoles`, { params: sessionDTO });
    // }

    // getAllRolesForUser(data: any) {
    //     let sessionDTO = data;
    //     return this.http.get(`${this.baseUrl}` + `/role/api/getAllRolesForUser`, { params: sessionDTO });
    // }
    getAllRolesForUser(data: any) {
        let sessionDTO = data;
        return this.http.get(`${this.baseUrl}` + `/role/api/getAllRolesForUser`, { params: sessionDTO });
    }
    // ----------- Code by Lipsa ----------------
    getAllUsers(data: any) {
        let sessionDTO = data;
        return this.http.get(`${this.baseUrl}` + `/user/api/admin/getAllActiveUsers`, { params: sessionDTO });
    }
    // getAllUsers(data: any) {
    //     let sessionDTO = data;
    //     return this.http.get(`http://localhost:12002` + `/user/api/admin/getAllActiveUsers`, { params: sessionDTO });
    // }
    getAllUserList(data: any) {
        let sessionDTO = data;
        return this.http.get(`${this.baseUrl}` + `/user/api/admin/getAllUserList`, { params: sessionDTO });
    }
    getAllUserListByUserType(data: any) {
        let sessionDTO = data;
        return this.http.get(`${this.baseUrl}` + `/user/api/admin/getAllUserListByUserType`, { params: sessionDTO });
    }
    createUser(user: User) {

        return this.http.post(`${this.baseUrl}` + `/user/api/admin/createUser`, user);
    }
    // createUser(user: User) {

    //     return this.http.post(`http://localhost:12002` + `/user/api/admin/createUser`, user);
    // }
    updateUser(user: User) {

        return this.http.patch(`${this.baseUrl}` + `/user/api/admin/updateUser`, user);

    }
    // updateUser(user: User) {

    //     return this.http.post(`http://localhost:12002` + `/user/api/admin/updateUser`, user);

    // }
    deleteUser(user: User) {
        return this.http.post(`${this.baseUrl}` + `/user/api/admin/deleteUser`, user);

    }

    unlockUser(user: User) {
        return this.http.post(`${this.baseUrl}` + `/user/api/admin/unlockUser`, user);
    }

    getAllFeatures(data: any) {
        let sessionDTO = data;
        return this.http.get(`${this.baseUrl}` + `/user/api/getAllFeatures`, { params: sessionDTO });
    }

    getSubFeaturesByFeatureId(fm: FeatureMaster) {
        return this.http.post(`${this.baseUrl}` + `/user/api/getSubFeaturesByFeatureId`, fm);
    }

    createRole(role: Role) {
        return this.http.post(`${this.baseUrl}` + `/role/api/createRole`, role);
    }

    // createRoleWithInfraAndAPM(role: Role) {
    //     return this.http.post(`${this.baseUrl}` + `/role/api/createRoleWithInfraAndAPM`, role);
    // }
    createRoleWithInfraAndAPM(role: Role) {
        return this.http.post(`http://localhost:12003` + `/role/api/createRoleWithInfraAndAPM`, role);
    }

    updateRoleWithInfraAndAPM(role: Role): Observable<object> {
        return this.http.post(`${this.baseUrl}` + '/role/api/updateRoleWithInfraAndAPM', role);
    }
    // updateRoleWithInfraAndAPM(role: Role): Observable<object> {
    //     return this.http.post(`http://localhost:12003` + '/role/api/updateRoleWithInfraAndAPM', role);
    // }

    deleteRole(role: Role): Observable<object> {
        return this.http.post(`${this.baseUrl}` + '/role/api/deleteRole', role);
    }
    // deleteRole(role: Role): Observable<object> {
    //     return this.http.post(`http://localhost:12003` + '/role/api/deleteRole', role);
    // }

    updateRole(role: Role): Observable<object> {
        return this.http.post(`${this.baseUrl}` + '/role/api/updateRole', role);
    }

    getAllSubFeatures(data: any): Observable<object> {
        let sessionDTO = data;
        return this.http.get(`${this.baseUrl}` + '/user/api/getAllSubFeatures', { params: sessionDTO });
    }

    getAllSubFeaturesByApplication(application: ApplicationMaster): Observable<object> {
        return this.http.post(`${this.baseUrl}` + '/feature/api/getSubFeaturesByApplication/id', application);
    }

    getGraphlistByApplicationID(applicationID: any): Observable<object> {
        return this.http.post(`${this.baseUrl}` + '/user/api/getGraphByApplicationID', { applicationId: applicationID });
    }
    getGraphByApplicationID(data: any): Observable<object> {
        return this.http.post(`${this.baseUrl}` + '/graph/api/getGraphByApplicationID', data);
    }

    getAllSubFeaturesByFeatureType(feature: Feature): Observable<object> {
        return this.http.post(`${this.baseUrl}` + '/feature/api/getSubFeaturesByFeatureType', feature);
    }
    // getAllSubFeaturesByFeatureType(feature: Feature): Observable<object> {
    //     return this.http.post(`http://localhost:12006` + '/feature/api/getSubFeaturesByFeatureType', feature);
    // }

    getAllSubFeaturesByApplicationAndFeature(data: any): Observable<object> {
        return this.http.post(`${this.baseUrl}` + '/feature/api/getSubFeaturesByApplicationAndFeature', data);
    }

    getAllGraphInSubfeature(data: any): Observable<object> {
        return this.http.post(`${this.baseUrl}` + '/graph/api/getAllGraphInSubfeature', data);
    }

    getUserDetails(user: User) {
        return this.http.post<User>(`${this.baseUrl}` + `/user/api/getUserDetails`, user);
    }

    getAllDashboard() {
        return this.http.get(`${this.baseUrl}` + `/user/api/admin/getAvailableApplications`);
    }

    getAllTrendDashboard() {
        return this.http.get(`${this.baseUrl}` + `/user/api/admin/getTrendanalysis`);
    }

    getAllRolesDetails(data: any) {
        let sessionDTO = data;
        return this.http.get(`${this.baseUrl}` + `/role/api/admin/getRoleDetails`, { params: sessionDTO });
    }
    getAllApprovers(user: User) {
        return this.http.post(`${this.baseUrl}` + `/user/api/admin/getAllApprovers`, user);
    }

    getApproversByUserType(user: User) {
        return this.http.post(`${this.baseUrl}` + `/user/api/admin/getApproversByUserType`, user);
    }
    // getApproversByUserType(user:User) {
    //     return this.http.post(`http://localhost:12002` + `/user/api/admin/getApproversByUserType`, user);
    // }

    setUserTheme(user: User) {
        return this.http.post(`${this.baseUrl}` + `/user/api/setUserTheme`, user);
    }

    getMailIdAndFullName(LdapUserId: String) {
        return this.http.post(`${this.baseUrl}` + '/admin/getmailidandfullname', { userid: LdapUserId });
    }

    // checkUserStatus(data: any) {
    //     let sessionDTO = data;
    //     return this.http.get(`${this.baseUrl}` + '/admin/checkUserStatus', { params: sessionDTO });
    // }

    // getAllRoleList(data: any) {
    //     let sessionDTO = data;
    //     return this.http.get(`http://localhost:12003` + `/role/api/admin/getAllRoleList`, { params: sessionDTO });
    // }

    // getUserId(id: any) {
    //     console.log(id);
    //     return this.http.get(`http://localhost:12002` + '/user/api/admin/getUserId');
    // }

    // getAllCustomRoles(data: any) {
    //     return this.http.get(`http://localhost:12003` + '/role/api/getAllCustomRoles');
    // }


    getAllCustomRoles(data: any) {
        return this.http.get(`${this.baseUrl}` + '/role/api/getAllCustomRoles', { params: data });
    }

    getUserId(id: any) {
        console.log(id);
        return this.http.get(`${this.baseUrl}` + '/user/api/admin/getUserId');
    }

    toggleLockUser(user: any) {
        return this.http.post(`${this.baseUrl}` + `/user/api/admin/toggleLockUser`, user);
    }

}
