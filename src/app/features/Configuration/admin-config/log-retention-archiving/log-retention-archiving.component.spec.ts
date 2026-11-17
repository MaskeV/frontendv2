import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogRetentionArchivingComponent } from './log-retention-archiving.component';

describe('LogRetentionArchivingComponent', () => {
  let component: LogRetentionArchivingComponent;
  let fixture: ComponentFixture<LogRetentionArchivingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LogRetentionArchivingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LogRetentionArchivingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
