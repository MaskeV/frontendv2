import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EksInstnanceListComponent } from './eks-instnance-list.component';

describe('EksInstnanceListComponent', () => {
  let component: EksInstnanceListComponent;
  let fixture: ComponentFixture<EksInstnanceListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EksInstnanceListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EksInstnanceListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
