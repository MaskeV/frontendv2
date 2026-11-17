import { Directive, ElementRef, HostListener, Optional } from '@angular/core';
import { NgControl } from '@angular/forms';
import { SanitizationService } from '../services/sanitization.service';

@Directive({
  selector: '[appSanitizeInput]',
  standalone: true
})
export class SanitizeInputDirective {

  constructor(
    private el: ElementRef,
    private sanitizationService: SanitizationService,
    @Optional() private control: NgControl
  ) {}


  @HostListener('blur')
  onBlur() {
    const rawValue = this.el.nativeElement.value;
    
    if (typeof rawValue === 'string') {
      const cleanValue = this.sanitizationService.sanitizeInput(rawValue);

      if (rawValue !== cleanValue) {
        this.el.nativeElement.value = cleanValue;

        if (this.control && this.control.control) {
          this.control.control.setValue(cleanValue, { emitEvent: false });
        }
      }
    }
  }
}
