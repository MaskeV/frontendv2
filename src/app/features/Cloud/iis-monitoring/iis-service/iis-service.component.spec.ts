import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IisServiceComponent } from './iis-service.component';

describe('IisServiceComponent', () => {
  let component: IisServiceComponent;
  let fixture: ComponentFixture<IisServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IisServiceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IisServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
