import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NginxInstanceComponent } from './nginx-instance.component';

describe('NginxInstanceComponent', () => {
  let component: NginxInstanceComponent;
  let fixture: ComponentFixture<NginxInstanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NginxInstanceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NginxInstanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
