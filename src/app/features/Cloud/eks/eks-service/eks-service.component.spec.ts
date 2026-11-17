import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EksServiceComponent } from './eks-service.component';

describe('EksServiceComponent', () => {
  let component: EksServiceComponent;
  let fixture: ComponentFixture<EksServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EksServiceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EksServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
