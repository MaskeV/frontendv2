import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NginxListComponent } from './nginx-list.component';

describe('NginxListComponent', () => {
  let component: NginxListComponent;
  let fixture: ComponentFixture<NginxListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NginxListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NginxListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return correct image path', () => {
    expect(component.getImagePath('NGINX')).toContain('nginx.png');
    expect(component.getImagePath('unknown')).toContain('UNDEFINED.png');
  });

  it('should fallback image on error', () => {
    const event = { target: { src: '' } } as any;
    component.onImageError(event);
    expect(event.target.src).toContain('UNDEFINED.png');
  });
});
