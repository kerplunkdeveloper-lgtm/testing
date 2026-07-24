const mongoose = require("mongoose");
const User = require("./User");

const businessProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Client is required"],
    },

    type: {
      type: String,
      required: [true, "Project type is required"],
      enum: ["Digital Marketing", "Website", "SEO"],
    },

    status: {
      type: String,
      default: "Active",
      enum: ["Active", "Completed", "On Hold", "Inactive"],
    },

    // CLIENT PAYMENT
    revenue: {
      type: Number,
      required: [true, "Revenue is required"],
      default: 0,
    },

    // EMPLOYEE TOTAL CTC
    cost: {
      type: Number,
      default: 0,
    },

    // REVENUE - COST
    profit: {
      type: Number,
      default: 0,
    },

    // PROFIT %
    margin: {
      type: Number,
      default: 0,
    },

    duration: {
      type: String,
      default: "Ongoing / Retainer",
    },

    employees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// AUTO CALCULATE COST / PROFIT / MARGIN
businessProjectSchema.pre("save", async function () {
  let totalCost = 0;

  if (this.employees && this.employees.length > 0) {
    const employees = await User.find({
      _id: { $in: this.employees },
    });

    employees.forEach((emp) => {
      const salary = emp.salary || 0;

      const overhead = emp.overheadPercent || 0;

      const ctc =
        salary + (salary * overhead) / 100;

      totalCost += ctc;
    });
  }

  this.cost = Math.round(totalCost);

  this.profit = Math.round(
    (this.revenue || 0) - totalCost
  );

  this.margin =
    this.revenue > 0
      ? Math.round(
          (this.profit / this.revenue) * 100
        )
      : 0;
});

module.exports = mongoose.model(
  "BusinessProject",
  businessProjectSchema
);