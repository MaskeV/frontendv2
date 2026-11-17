import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationIpMappingNewComponent } from './application-ip-mapping-new.component';

describe('ApplicationIpMappingNewComponent', () => {
  let component: ApplicationIpMappingNewComponent;
  let fixture: ComponentFixture<ApplicationIpMappingNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationIpMappingNewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApplicationIpMappingNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
