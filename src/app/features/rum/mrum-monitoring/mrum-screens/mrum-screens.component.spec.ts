import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MrumTransactionsComponent } from './mrum-transactions.component';

describe('MrumTransactionsComponent', () => {
  let component: MrumTransactionsComponent;
  let fixture: ComponentFixture<MrumTransactionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MrumTransactionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MrumTransactionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
