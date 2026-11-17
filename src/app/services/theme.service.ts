import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  private myTheme ="yellow";
  constructor() { }

  setMyTheme(value: string): void  {
    sessionStorage.setItem('themeColour', value);
  }

  getMyTheme()
  {
    return sessionStorage.getItem('themeColour');
  }

  
}
