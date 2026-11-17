import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MrumDependeciesComponent } from './mrum-dependecies.component';

describe('MrumDependeciesComponent', () => {
  let component: MrumDependeciesComponent;
  let fixture: ComponentFixture<MrumDependeciesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MrumDependeciesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MrumDependeciesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
