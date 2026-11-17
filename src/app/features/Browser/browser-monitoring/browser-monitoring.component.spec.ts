import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrowserMonitoringComponent } from './browser-monitoring.component';

describe('BrowserMonitoringComponent', () => {
  let component: BrowserMonitoringComponent;
  let fixture: ComponentFixture<BrowserMonitoringComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserMonitoringComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrowserMonitoringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return correct image path', () => {
    expect(component.getImagePath('ANGULAR')).toContain('angular.png');
    expect(component.getImagePath('REACT')).toContain('react.png');
    expect(component.getImagePath('VUE')).toContain('vue.png');
    expect(component.getImagePath('unknown')).toContain('unknown.png');
  });

  it('should fallback image on error', () => {
    const event = { target: { src: '' } } as any;
    component.onImageError(event);
    expect(event.target.src).toContain('UNDEFINED.png');
  });
});
