import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivemqOverviewComponent } from './activemq-overview.component';

describe('ActivemqOverviewComponent', () => {
  let component: ActivemqOverviewComponent;
  let fixture: ComponentFixture<ActivemqOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivemqOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivemqOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
