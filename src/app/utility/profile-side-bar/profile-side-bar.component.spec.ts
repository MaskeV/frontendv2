import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileSideBarComponent } from './profile-side-bar.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ProfileSideBarComponent', () => {
  let component: ProfileSideBarComponent;
  let fixture: ComponentFixture<ProfileSideBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileSideBarComponent, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileSideBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
