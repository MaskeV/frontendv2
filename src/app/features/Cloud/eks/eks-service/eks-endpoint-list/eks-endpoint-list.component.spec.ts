import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EksEndpointListComponent } from './eks-endpoint-list.component';

describe('EksEndpointListComponent', () => {
  let component: EksEndpointListComponent;
  let fixture: ComponentFixture<EksEndpointListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EksEndpointListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EksEndpointListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
