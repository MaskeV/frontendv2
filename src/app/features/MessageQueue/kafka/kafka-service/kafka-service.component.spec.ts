import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KafkaServiceComponent } from './kafka-service.component';

describe('KafkaServiceComponent', () => {
  let component: KafkaServiceComponent;
  let fixture: ComponentFixture<KafkaServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KafkaServiceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KafkaServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
