import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrowserServiceComponent } from './browser-service.component';

describe('BrowserServiceComponent', () => {
  let component: BrowserServiceComponent;
  let fixture: ComponentFixture<BrowserServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserServiceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrowserServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return correct image path', () => {
    expect(component.getImagePath('ANGULAR')).toContain('angular.png');
    expect(component.getImagePath('REACT')).toContain('react.png');
    expect(component.getImagePath('VUE')).toContain('vue.jpeg');
    expect(component.getImagePath('unknown')).toContain('UNDEFINED.png');
  });

  it('should fallback image on error', () => {
    const event = { target: { src: '' } } as any;
    component.onImageError(event);
    expect(event.target.src).toContain('UNDEFINED.png');
  });
});
