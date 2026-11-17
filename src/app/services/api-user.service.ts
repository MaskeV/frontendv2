import { Injectable } from '@angular/core';
import { DecoderService } from './decoder.service';

@Injectable({
  providedIn: 'root'
})
export class ApiUserService {

  constructor(private decoderService: DecoderService) { }

  getCurrentUser(): any {
    const encryptedUser = sessionStorage.getItem('currentUser');
    if (!encryptedUser) return null;
    const decryptedData = this.decoderService.decryptJson(JSON.parse(encryptedUser));
    if (typeof decryptedData === 'object') {
        return decryptedData; 
    }
    try {
        const parsedUser = JSON.parse(decryptedData);
        return parsedUser;
    } catch (error) {
        return null;
    }
  }

  hasFeature(featureName: string): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !currentUser.subFeatures) return false;

    return currentUser.subFeatures.some((feature: any) =>
      feature.subFeature.some((sub: any) => sub.name === featureName)
    );
  }
}
