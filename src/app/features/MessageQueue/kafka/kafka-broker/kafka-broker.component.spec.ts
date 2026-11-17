import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KafkaBrokerComponent } from './kafka-broker.component';

describe('KafkaBrokerComponent', () => {
  let component: KafkaBrokerComponent;
  let fixture: ComponentFixture<KafkaBrokerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KafkaBrokerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KafkaBrokerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
