import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivemqDestinationComponent } from './activemq-destination.component';

describe('ActivemqDestinationComponent', () => {
  let component: ActivemqDestinationComponent;
  let fixture: ComponentFixture<ActivemqDestinationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivemqDestinationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivemqDestinationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
