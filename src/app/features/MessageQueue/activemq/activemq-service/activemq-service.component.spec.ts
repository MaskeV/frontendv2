import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivemqServiceComponent } from './activemq-service.component';

describe('ActivemqServiceComponent', () => {
  let component: ActivemqServiceComponent;
  let fixture: ComponentFixture<ActivemqServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivemqServiceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivemqServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
