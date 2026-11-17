import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MrumVersionsComponent } from './mrum-versions.component';

describe('MrumVersionsComponent', () => {
  let component: MrumVersionsComponent;
  let fixture: ComponentFixture<MrumVersionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MrumVersionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MrumVersionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
