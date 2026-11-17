import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EksComponent } from './eks.component';

describe('EksComponent', () => {
  let component: EksComponent;
  let fixture: ComponentFixture<EksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EksComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
