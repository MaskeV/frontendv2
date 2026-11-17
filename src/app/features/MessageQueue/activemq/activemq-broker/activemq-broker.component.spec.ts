import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivemqBrokerComponent } from './activemq-broker.component';

describe('ActivemqBrokerComponent', () => {
  let component: ActivemqBrokerComponent;
  let fixture: ComponentFixture<ActivemqBrokerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivemqBrokerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivemqBrokerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
