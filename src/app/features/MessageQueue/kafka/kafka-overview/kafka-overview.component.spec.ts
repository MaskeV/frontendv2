import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KafkaOverviewComponent } from './kafka-overview.component';

describe('KafkaOverviewComponent', () => {
  let component: KafkaOverviewComponent;
  let fixture: ComponentFixture<KafkaOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KafkaOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KafkaOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
