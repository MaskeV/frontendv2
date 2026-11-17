import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StandardFormComponent } from './standard-form.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('StandardFormComponent', () => {
  let component: StandardFormComponent;
  let fixture: ComponentFixture<StandardFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StandardFormComponent, HttpClientTestingModule],
      
    })
    .compileComponents();

    fixture = TestBed.createComponent(StandardFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
