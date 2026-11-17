import { ComponentFixture, TestBed } from "@angular/core/testing";

import { QueryTabComponent } from "./query-tab-component";
import { HttpClientTestingModule } from "@angular/common/http/testing";

describe("QueryTabComponentComponent", () => {
  let component: QueryTabComponent;
  let fixture: ComponentFixture<QueryTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueryTabComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(QueryTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
