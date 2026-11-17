import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NonRelationalComponent } from './non-relational.component';

describe('NonRelationalComponent', () => {
  let component: NonRelationalComponent;
  let fixture: ComponentFixture<NonRelationalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NonRelationalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NonRelationalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
