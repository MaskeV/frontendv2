import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PodDetailsComponent } from './pod-details.component';

describe('PodDetailsComponent', () => {
  let component: PodDetailsComponent;
  let fixture: ComponentFixture<PodDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PodDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PodDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
