import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SmReportsComponent } from './sm-reports.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('SmReportsComponent', () => {
  let component: SmReportsComponent;
  let fixture: ComponentFixture<SmReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SmReportsComponent, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SmReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
